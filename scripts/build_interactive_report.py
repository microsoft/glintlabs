#!/usr/bin/env python
"""Build the required interactive Glint report from a completed analysis."""

from __future__ import annotations

import argparse
import json
import math
import re
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd
from scipy.stats import t as student_t


MIN_N = 5
RELATIONSHIP_MIN_N = 30
ALERT_MIN_N = 10
FILTERED_ALERT_MIN_N = 5


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--output-dir", required=True)
    return parser.parse_args()


def resolve(base: Path, value: str | None) -> Path | None:
    if not value:
        return None
    path = Path(value)
    return path if path.is_absolute() else (base / path).resolve()


def label(value: str) -> str:
    return re.sub(r"\s+", " ", value.removeprefix("Q_").replace("_", " ")).title()


def normalize_items(frame: pd.DataFrame, questions: list[str], scale: int) -> None:
    for question in questions:
        values = sorted(frame[question].dropna().unique())
        if values and (min(values) < 1 or max(values) > scale):
            if len(values) > scale:
                raise ValueError(f"{question} has more than {scale} response values.")
            mapping = {value: index + 1 for index, value in enumerate(values)}
            frame[question] = frame[question].map(mapping)


def bucket_numeric(frame: pd.DataFrame, protected: set[str]) -> dict[str, list[str]]:
    bucketed = {}
    for column in frame.select_dtypes(include="number").columns:
        if column in protected or frame[column].nunique(dropna=True) <= 10:
            continue
        values = frame[column]
        if values.min() == 0 and float((values == 0).mean()) >= 0.2:
            positive = values[values > 0]
            cuts = pd.qcut(positive, 4, duplicates="drop")
            mapped = pd.Series("0", index=frame.index, dtype="object")
            mapped.loc[positive.index] = cuts.map(
                lambda item: f"{math.floor(item.left) + 1}-{math.floor(item.right)}"
            ).astype("object")
        else:
            cuts = pd.qcut(values, 5, duplicates="drop")
            mapped = cuts.map(
                lambda item: f"{math.floor(item.left) + 1}-{math.floor(item.right)}"
            ).astype("object")
        frame[column] = mapped
        bucketed[column] = sorted(frame[column].dropna().astype(str).unique())
    return bucketed


def metrics(frame: pd.DataFrame, questions: list[str]) -> list[list[float | int]]:
    rows = []
    for question in questions:
        values = frame[question].dropna()
        rows.append(
            [
                int(round((values.mean() - 1) * 25)),
                round(float((values <= 2).mean() * 100), 1),
                round(float((values == 3).mean() * 100), 1),
                round(float((values >= 4).mean() * 100), 1),
                int(len(values)),
            ]
        )
    return rows


def segment_cube(
    frame: pd.DataFrame, questions: list[str], attributes: list[str]
) -> dict[str, Any]:
    result = {}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute, sort=True):
            employees = group["__employee_id"].nunique()
            if employees >= MIN_N:
                values[str(value)] = {
                    "n": int(employees),
                    "items": metrics(group, questions),
                }
        result[attribute] = {"label": label(attribute), "values": values}
    return result


def cycle_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
) -> dict[str, Any]:
    if not cycle_col:
        return {"cycles": [], "overall": {}, "segments": {}}
    cycles = sorted(frame[cycle_col].dropna().astype(str).unique())
    if len(cycles) != 2:
        return {"cycles": cycles, "overall": {}, "segments": {}}
    overall = {
        cycle: {
            "n": int(len(group)),
            "items": metrics(group, questions),
        }
        for cycle, group in frame.groupby(cycle_col)
    }
    segments = {}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            cycle_values = {}
            for cycle in cycles:
                subset = group[group[cycle_col].astype(str) == cycle]
                if len(subset) >= MIN_N:
                    cycle_values[cycle] = {
                        "n": int(len(subset)),
                        "items": metrics(subset, questions),
                    }
            if len(cycle_values) == 2:
                values[str(value)] = cycle_values
        segments[attribute] = values
    return {"cycles": cycles, "overall": overall, "segments": segments}


def correlation_rows(frame: pd.DataFrame, questions: list[str]) -> list[list[Any]]:
    n = len(frame)
    matrix = frame[questions].corr()
    rows = []
    for first in range(len(questions)):
        for second in range(first + 1, len(questions)):
            r = float(matrix.iloc[first, second])
            if not math.isfinite(r):
                continue
            statistic = r * math.sqrt((n - 2) / max(1e-12, 1 - r * r))
            p = float(2 * student_t.sf(abs(statistic), n - 2))
            rows.append([first, second, round(r, 6), p, n])
    return rows


def relationship_cube(
    frame: pd.DataFrame, questions: list[str], attributes: list[str]
) -> dict[str, Any]:
    result = {"overall": correlation_rows(frame, questions), "segments": {}}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            if len(group) >= RELATIONSHIP_MIN_N:
                rows = correlation_rows(group, questions)
                if len(rows) == len(questions) * (len(questions) - 1) // 2:
                    values[str(value)] = rows
        result["segments"][attribute] = values
    return result


def heatmap_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
) -> dict[str, Any]:
    if not cycle_col:
        return {"cycles": [], "attributes": [], "overall": {}, "filtered": {}}
    eligible = [
        attribute
        for attribute in attributes
        if 4 <= frame[attribute].nunique(dropna=True) <= 5 and attribute != cycle_col
    ]
    cycles = sorted(frame[cycle_col].dropna().astype(str).unique())

    def build(source: pd.DataFrame) -> dict[str, Any]:
        output = {}
        for cycle in cycles:
            cycle_frame = source[source[cycle_col].astype(str) == cycle]
            attrs = {}
            for attribute in eligible:
                values = []
                for value, group in cycle_frame.dropna(subset=[attribute]).groupby(attribute):
                    if len(group) >= MIN_N:
                        values.append(
                            {
                                "value": str(value),
                                "n": int(len(group)),
                                "items": metrics(group, questions),
                            }
                        )
                if 4 <= len(values) <= 5:
                    attrs[attribute] = {"label": label(attribute), "values": values}
            if attrs:
                output[cycle] = attrs
        return output

    filtered = {}
    for parent in attributes:
        values = {}
        for value, group in frame.dropna(subset=[parent]).groupby(parent):
            built = build(group)
            if built:
                values[str(value)] = built
        filtered[parent] = values
    return {"cycles": cycles, "attributes": eligible, "overall": build(frame), "filtered": filtered}


def alerts(
    frame: pd.DataFrame,
    questions: list[str],
    cycle_col: str | None,
    team_col: str | None,
    minimum: int,
) -> list[dict[str, Any]]:
    if not cycle_col or not team_col:
        return []
    cycles = sorted(frame[cycle_col].dropna().astype(str).unique())
    if len(cycles) != 2:
        return []
    output = []
    for team, group in frame.dropna(subset=[team_col]).groupby(team_col):
        subsets = [group[group[cycle_col].astype(str) == cycle] for cycle in cycles]
        if any(len(item) < minimum for item in subsets):
            continue
        first, second = [metrics(item, questions) for item in subsets]
        first_scores = [item[0] for item in first]
        second_scores = [item[0] for item in second]
        deltas = [b - a for a, b in zip(first_scores, second_scores)]
        worst = min(range(len(deltas)), key=deltas.__getitem__)
        output.append(
            {
                "team": str(team),
                "from": round(sum(first_scores) / len(first_scores)),
                "to": round(sum(second_scores) / len(second_scores)),
                "delta": round(sum(second_scores) / len(second_scores))
                - round(sum(first_scores) / len(first_scores)),
                "nFrom": len(subsets[0]),
                "nTo": len(subsets[1]),
                "declining": sum(value < 0 for value in deltas),
                "worstQuestion": worst,
                "worstDelta": deltas[worst],
            }
        )
    return sorted(output, key=lambda item: (item["delta"], item["worstDelta"]))


def alert_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
    team_col: str | None,
) -> dict[str, Any]:
    filtered = {}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            rows = alerts(
                group,
                questions,
                cycle_col,
                team_col,
                FILTERED_ALERT_MIN_N,
            )
            if rows:
                values[str(value)] = rows
        filtered[attribute] = values
    return {
        "overall": alerts(frame, questions, cycle_col, team_col, ALERT_MIN_N),
        "filtered": filtered,
        "available": bool(cycle_col and team_col),
    }


def html_page(data: dict[str, Any]) -> str:
    encoded = json.dumps(data, separators=(",", ":")).replace("<", "\\u003c")
    return """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Viva Glint survey analysis</title>
<script>document.documentElement.setAttribute("data-theme","light")</script>
<style>
:root{--bg:#fafafa;--surface:#fff;--soft:#f5f5f5;--border:#e0e0e0;--text:#242424;--muted:#616161;--blue:#335ccc;--tint:#e5eeff;--red:#bc2f32;--green:#0e700e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 "Segoe UI",Aptos,Calibri,sans-serif}.page{width:min(1380px,calc(100% - 40px));margin:auto;padding:32px 0 56px}h1{font-size:40px;margin:20px 0 8px}h2{font-size:24px;margin:0 0 8px}.muted{color:var(--muted)}.tabs,.tools{display:flex;gap:8px;flex-wrap:wrap}.tabs{border-bottom:1px solid var(--border);margin-top:24px}.tab{border:0;border-bottom:3px solid transparent;background:transparent;padding:12px;color:var(--muted);cursor:pointer}.tab[aria-selected=true]{border-bottom-color:var(--blue);color:var(--blue);font-weight:700}.panel{margin-top:20px;padding:26px;background:var(--surface);border:1px solid var(--border);border-radius:16px}select,input{min-height:40px;padding:0 10px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}label{display:grid;gap:4px;font-size:12px;color:var(--muted)}[hidden]{display:none!important}.tools{align-items:end;margin:16px 0}.notice{padding:14px;border-left:4px solid var(--blue);background:var(--tint);border-radius:10px;margin:14px 0}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{border:1px solid var(--border);border-radius:12px;padding:14px}.card strong{font-size:22px;color:var(--blue)}.stack{display:flex;height:13px;border-radius:8px;overflow:hidden;background:var(--soft)}.u{background:var(--red)}.n{background:#b8b8b8}.f{background:var(--blue)}.row{display:grid;grid-template-columns:minmax(210px,1fr) minmax(300px,2fr) 80px;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)}.pair{display:grid;gap:6px}.delta{font-weight:700}.down{color:var(--red)}.up{color:var(--green)}.scroll{overflow:auto;max-height:720px;border:1px solid var(--border)}table{border-collapse:collapse;width:100%}th,td{padding:8px;border-bottom:1px solid var(--border);text-align:left}th{position:sticky;top:0;background:var(--surface)}.matrix td,.heat td{text-align:center;cursor:pointer;min-width:48px}.heat th:first-child{min-width:210px}.download{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.download a{padding:12px;border:1px solid var(--border);border-radius:10px;color:var(--blue)}@media(max-width:800px){.grid,.download{grid-template-columns:1fr 1fr}.row{grid-template-columns:1fr}}@media(max-width:520px){.grid,.download{grid-template-columns:1fr}}
</style></head><body><main class="page"><div><strong style="color:var(--blue)">Viva Glint</strong><h1>Survey analysis</h1><p class="muted">Interactive, privacy-safe aggregate report</p></div>
<nav class="tabs">__TABS__</nav>
<div class="panel"><div class="tools"><label>Report attribute<select id="attr"><option value="">Company overall</option></select></label><label>Value<select id="value" disabled></select></label><span id="filterNote" class="muted"></span></div></div>
__PANELS__
</main><script>const D=__DATA__;
const names=D.questions.map(q=>D.labels[q]);const tabs=[...document.querySelectorAll(".tab")];tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.setAttribute("aria-selected",x===t));document.querySelectorAll("[role=tabpanel]").forEach(p=>p.hidden=p.id!==t.dataset.id)});const attr=document.querySelector("#attr"),val=document.querySelector("#value");Object.entries(D.segments).forEach(([k,v])=>{if(Object.keys(v.values).length)attr.add(new Option(v.label,k))});function selected(){if(!attr.value)return null;return D.segments[attr.value].values[val.value]}function loadValues(){val.innerHTML="";if(!attr.value){val.disabled=true}else{val.disabled=false;Object.entries(D.segments[attr.value].values).forEach(([k,v])=>val.add(new Option(k+" · n="+v.n,k)))}render()}attr.onchange=loadValues;val.onchange=render;
function item(x,i){return{score:x[0],u:x[1],n:x[2],f:x[3],count:x[4],question:D.questions[i]}}function stack(x){return`<div class=stack><i class=u style="width:${x.u}%"></i><i class=n style="width:${x.n}%"></i><i class=f style="width:${x.f}%"></i></div>`}function current(){const s=selected();return s?s.items.map(item):D.overall.map(item)}function renderOverview(){const rows=current(),avg=Math.round(rows.reduce((a,x)=>a+x.score,0)/rows.length);document.querySelector("#kpis").innerHTML=[["Responses",rows[0].count.toLocaleString()],["Items",rows.length],["Average",avg],["Filter",attr.value?val.value:"Company"]].map(x=>`<div class=card><span class=muted>${x[0]}</span><br><strong>${x[1]}</strong></div>`).join("");document.querySelector("#high").innerHTML=[...rows].sort((a,b)=>b.score-a.score).slice(0,5).map(x=>`<div class=card>${D.labels[x.question]} <strong>${x.score}</strong>${stack(x)}</div>`).join("");document.querySelector("#low").innerHTML=[...rows].sort((a,b)=>a.score-b.score).slice(0,5).map(x=>`<div class=card>${D.labels[x.question]} <strong>${x.score}</strong>${stack(x)}</div>`).join("")}
function renderItems(){const rows=current();document.querySelector("#itemsList").innerHTML=rows.map((x,i)=>{const c=item(D.overall[i],i),d=x.score-c.score;return`<div class=row><div><b>${D.labels[x.question]}</b><br><span class=muted>${x.question}</span></div><div class=pair><span>Segment ${x.score}${stack(x)}</span><span>Company ${c.score}${stack(c)}</span></div><div class="delta ${d<0?"down":d>0?"up":""}">${d>0?"+":""}${d}</div></div>`}).join("")}
function cycleSource(){if(D.cycles.cycles.length!==2)return null;if(!attr.value)return D.cycles.overall;return D.cycles.segments[attr.value]?.[val.value]}function renderChanges(){const source=cycleSource(),box=document.querySelector("#changesList");if(!source){box.innerHTML="<div class=notice>Two privacy-safe survey cycles are required for this selection.</div>";return}const [a,b]=D.cycles.cycles;const rows=D.questions.map((q,i)=>({q,a:item(source[a].items[i],i),b:item(source[b].items[i],i)})).sort((x,y)=>Math.abs(y.b.score-y.a.score)-Math.abs(x.b.score-x.a.score));box.innerHTML=rows.map(x=>{const d=x.b.score-x.a.score;return`<div class=row><b>${D.labels[x.q]}</b><span>${a}: ${x.a.score} (n=${source[a].n.toLocaleString()}) → ${b}: ${x.b.score} (n=${source[b].n.toLocaleString()})</span><span class="delta ${d<0?"down":d>0?"up":""}">${d>0?"+":""}${d}</span></div>`}).join("")}
const heatCycle=document.querySelector("#heatCycle"),heatAttr=document.querySelector("#heatAttr");function heatSource(){return attr.value?D.heat.filtered[attr.value]?.[val.value]:D.heat.overall}function loadHeat(){const source=heatSource()||{};heatCycle.innerHTML="";Object.keys(source).forEach(x=>heatCycle.add(new Option(x,x)));heatAttr.innerHTML="";Object.entries(source[heatCycle.value]||{}).forEach(([k,v])=>heatAttr.add(new Option(v.label,k)));renderHeat()}function renderHeat(){const block=heatSource()?.[heatCycle.value]?.[heatAttr.value],table=document.querySelector("#heatTable");if(!block){table.innerHTML="<tr><td>No four- or five-value heatmap is available for this filtered segment.</td></tr>";return}table.innerHTML=`<thead><tr><th>Question</th>${block.values.map(x=>`<th>${x.value}<br><small>n=${x.n}</small></th>`).join("")}</tr></thead><tbody>${D.questions.map((q,i)=>`<tr><th>${D.labels[q]}</th>${block.values.map(x=>`<td>${x.items[i][0]}</td>`).join("")}</tr>`).join("")}</tbody>`}heatCycle.onchange=()=>{heatAttr.innerHTML="";Object.entries(heatSource()?.[heatCycle.value]||{}).forEach(([k,v])=>heatAttr.add(new Option(v.label,k)));renderHeat()};heatAttr.onchange=renderHeat;
function relSource(){if(!attr.value)return D.relationships.overall;return D.relationships.segments[attr.value]?.[val.value]}function renderRelationships(){const rows=relSource(),table=document.querySelector("#corr");if(!rows){table.innerHTML="<tr><td>No segment matrix is available below 30 response rows.</td></tr>";return}const map=new Map(rows.flatMap(x=>[[x[0]+"|"+x[1],x],[x[1]+"|"+x[0],x]]));table.innerHTML=`<thead><tr><th>Item</th>${names.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${names.map((name,i)=>`<tr><th>${name}</th>${names.map((_,j)=>{if(i===j)return"<td>1.00</td>";const pair=map.get(i+"|"+j);return`<td>${pair?pair[2].toFixed(2):"—"}</td>`}).join("")}</tr>`).join("")}</tbody>`}
function renderAlerts(){const source=attr.value?(D.alerts.filtered[attr.value]?.[val.value]||[]):D.alerts.overall;document.querySelector("#alertsList").innerHTML=!D.alerts.available?"<div class=notice>Team and two-cycle columns are required.</div>":source.slice(0,50).map(x=>`<div class=row><b>${x.team}</b><span>${x.from} → ${x.to}; n=${x.nFrom}/${x.nTo}; ${x.declining} items down; largest: ${names[x.worstQuestion]} ${x.worstDelta}</span><span class=down>${x.delta}</span></div>`).join("")||"<div class=notice>No teams meet the minimum N for this filter.</div>"}
function renderStatic(){document.querySelector("#factorList").innerHTML=D.factors.map(x=>`<div class=card><b>${D.labels[x.question]||x.question}</b><br>Factor ${x.factor}; loading ${Number(x.loading).toFixed(3)}</div>`).join("")||"<div class=notice>Factor analysis was not completed.</div>";document.querySelector("#attritionStatus").textContent=D.attrition;document.querySelector("#downloadList").innerHTML=D.downloads.map(x=>`<a href="${x}">${x}</a>`).join("")}
function render(){document.querySelector("#filterNote").textContent=attr.value?D.segments[attr.value].label+": "+val.value:"All employees";renderOverview();renderItems();renderChanges();loadHeat();renderRelationships();renderAlerts()}renderStatic();loadValues();</script></body></html>""".replace(
        "__DATA__", encoded
    ).replace(
        "__TABS__",
        "".join(
            f'<button class="tab" data-id="{key}" aria-selected="{"true" if index == 0 else "false"}">{title}</button>'
            for index, (key, title) in enumerate(
                [
                    ("overview", "Overview"), ("items", "Item results"),
                    ("changes", "Scores change"), ("heatmap", "Heatmap"),
                    ("relationships", "Relationships"), ("alerts", "Alerts"),
                    ("factors", "Factors"), ("attrition", "Attrition analysis"),
                    ("downloads", "Downloads"),
                ]
            )
        ),
    ).replace(
        "__PANELS__",
        """<section class=panel id=overview role=tabpanel><h2>Overview</h2><div class=grid id=kpis></div><h3>Highest scores</h3><div class=grid id=high></div><h3>Focus opportunities</h3><div class=grid id=low></div></section>
<section class=panel id=items role=tabpanel hidden><h2>Item results</h2><div id=itemsList></div></section>
<section class=panel id=changes role=tabpanel hidden><h2>Scores change</h2><div id=changesList></div></section>
<section class=panel id=heatmap role=tabpanel hidden><h2>Heatmap</h2><div class=tools><label>Survey<select id=heatCycle></select></label><label>Attribute<select id=heatAttr></select></label></div><div class=scroll><table class=heat id=heatTable></table></div></section>
<section class=panel id=relationships role=tabpanel hidden><h2>Relationships</h2><div class=scroll><table class=matrix id=corr></table></div></section>
<section class=panel id=alerts role=tabpanel hidden><h2>Alerts</h2><div class=notice>Screening signals only. Company alerts require n=10 per cycle; filtered alerts require n=5.</div><div id=alertsList></div></section>
<section class=panel id=factors role=tabpanel hidden><h2>Factors</h2><div class=notice>Factor structure remains company-wide pending stability and measurement-invariance review.</div><div id=factorList></div></section>
<section class=panel id=attrition role=tabpanel hidden><h2>Attrition analysis</h2><div class=notice id=attritionStatus></div></section>
<section class=panel id=downloads role=tabpanel hidden><h2>Downloads</h2><div class=download id=downloadList></div></section>""",
    )


def main() -> int:
    options = args()
    config_path = Path(options.config).resolve()
    output = Path(options.output_dir).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    manifest = json.loads((output / "analysis-manifest.json").read_text(encoding="utf-8"))
    if manifest["repeatability_check"]["status"] != "passed":
        raise ValueError("Interactive report requires a passed repeatability check.")

    survey_path = resolve(config_path.parent, config["survey_csv"])
    frame = pd.read_csv(survey_path)
    questions = config.get("question_cols") or pd.read_csv(output / "descriptives.csv")[
        "question"
    ].tolist()
    normalize_items(frame, questions, int(config["scale_points"]))
    emp_id = config["emp_id_col"]
    frame["__employee_id"] = frame[emp_id]

    attribute_file = resolve(config_path.parent, config.get("attribute_file"))
    joined_attribute_cols: list[str] = []
    if attribute_file:
        attribute_frame = pd.read_csv(attribute_file)
        joined_attribute_cols = [
            column for column in attribute_frame.columns if column != emp_id
        ]
        frame = frame.merge(
            attribute_frame,
            on=emp_id,
            how="left",
            validate="many_to_one",
        )

    configured = config.get("attribute_cols") or []
    attributes = list(dict.fromkeys([
        *configured,
        *joined_attribute_cols,
        *(
            column
            for column in (
                "client_uuid",
                "survey_cycle_title",
                "after_hours_collab",
                "internal_network_size",
                "meeting_hours",
            )
            if column in frame.columns
        ),
    ]))
    attributes = [column for column in attributes if column in frame.columns]
    bucket_numeric(frame, {emp_id, "__employee_id", *questions})
    cycle_col = "survey_cycle_title" if "survey_cycle_title" in frame.columns else None
    team_col = next(
        (column for column in ("team_id", "manager_id", "Manager ID") if column in frame.columns),
        None,
    )

    overall = metrics(frame, questions)
    segments = segment_cube(frame, questions, attributes)
    cycles = cycle_cube(frame, questions, attributes, cycle_col)
    relationships = relationship_cube(frame, questions, attributes)
    heat = heatmap_cube(frame, questions, attributes, cycle_col)
    alert_data = alert_cube(frame, questions, attributes, cycle_col, team_col)
    factors_path = output / "factor_analysis_summary.csv"
    factors = pd.read_csv(factors_path).to_dict("records") if factors_path.exists() else []
    attrition_status = next(
        (
            item.get("message", item["status"])
            for item in manifest["analyses"]
            if item["name"] == "attrition"
        ),
        "Attrition analysis was not requested.",
    )
    report_name = f"{output.name}-report.html"
    zip_name = f"{output.name}-share.zip"
    manifest["report_generation"] = {
        "status": "completed",
        "report": report_name,
        "share_zip": zip_name,
        "format_contract": "references/skills/analyze-survey/interactive-report-contract.md",
    }
    (output / "analysis-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    excluded_downloads = {survey_path.name}
    if attribute_file:
        excluded_downloads.add(attribute_file.name)
    downloads = sorted(
        path.name
        for path in output.iterdir()
        if path.is_file() and path.suffix.lower() in {".csv", ".json"}
        and path.name not in excluded_downloads
    )
    data = {
        "questions": questions,
        "labels": {question: label(question) for question in questions},
        "overall": overall,
        "segments": segments,
        "cycles": cycles,
        "relationships": relationships,
        "heat": heat,
        "alerts": alert_data,
        "factors": factors,
        "attrition": attrition_status,
        "downloads": downloads,
    }
    report_path = output / report_name
    report_path.write_text(html_page(data), encoding="utf-8")

    readme = output / "SHARING_README.txt"
    readme.write_text(
        "Extract this ZIP and open OPEN_REPORT.html. Raw respondent files are excluded.\n",
        encoding="utf-8",
    )
    zip_path = output / zip_name
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(report_path, "OPEN_REPORT.html")
        archive.write(readme, readme.name)
        for name in downloads:
            archive.write(output / name, name)
    print(json.dumps({"report": str(report_path), "share_zip": str(zip_path)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
