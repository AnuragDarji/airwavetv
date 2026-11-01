import {
  Baby, Briefcase, Church, Clapperboard, CloudSun, Compass, Film, Gamepad2,
  GraduationCap, Heart, Landmark, Laugh, Leaf, Library, Music2, Newspaper,
  Plane, Radio, ShoppingBag, Sparkles, Trophy, Tv, UtensilsCrossed, Users,
  Globe, Shapes, type LucideIcon,
} from "lucide-react";

const MAP: [RegExp, LucideIcon][] = [
  [/news/i, Newspaper],
  [/sport/i, Trophy],
  [/movie|cinema/i, Clapperboard],
  [/music/i, Music2],
  [/kid|animation|cartoon/i, Baby],
  [/family/i, Users],
  [/document/i, Film],
  [/entertain|general/i, Sparkles],
  [/comedy/i, Laugh],
  [/relig|spirit/i, Church],
  [/shop/i, ShoppingBag],
  [/educat|learn/i, GraduationCap],
  [/cook|food|lifestyle/i, UtensilsCrossed],
  [/travel/i, Plane],
  [/weather/i, CloudSun],
  [/public|government|legislat/i, Landmark],
  [/outdoor|nature|auto/i, Leaf],
  [/business|finance/i, Briefcase],
  [/culture|classic|series/i, Library],
  [/game/i, Gamepad2],
  [/radio/i, Radio],
  [/relax|health|wellness/i, Heart],
  [/science|tech/i, Compass],
  [/international|world|global/i, Globe],
  [/uncategor/i, Shapes],
];

export function iconFor(category: string): LucideIcon {
  for (const [re, icon] of MAP) if (re.test(category)) return icon;
  return Tv;
}
