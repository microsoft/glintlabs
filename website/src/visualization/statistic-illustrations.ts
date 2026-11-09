import { featuredIllustrations } from "../publishing/featured-illustrations.ts";

const defaults = ["celebration", "data-flow", "people"];

export const statisticIllustrations = featuredIllustrations.map(illustration => ({
  ...illustration,
  src: defaults.includes(illustration.id)
    ? `/figma/illustrated-statistics/${illustration.id}.svg` : illustration.src,
}));

export function statisticIllustration(id: string | undefined, index: number) {
  return statisticIllustrations.find(illustration => illustration.id === (id ?? defaults[index % defaults.length]))
    ?? statisticIllustrations.find(illustration => illustration.id === defaults[index % defaults.length])!;
}
