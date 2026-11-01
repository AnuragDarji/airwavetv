/** TV-style channel number, e.g. 7 -> "007". */
export const fmtNum = (n: number) => String(n).padStart(3, "0");
