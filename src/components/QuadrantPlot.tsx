import { QUADRANT_DIVIDERS, type Verdict } from "@/lib/verdict";
import { cn } from "@/lib/utils";

export interface QuadrantPoint {
  id: string;
  name: string;
  /** Normalized 0..1: x = cost+effort burden, y = perceived value. */
  x: number;
  y: number;
  verdict: Verdict;
  measured?: boolean;
}

const DOT_COLORS: Record<Verdict, string> = {
  "quick-win": "#10b981",
  "strategic-bet": "#e4e4e7",
  filler: "#71717a",
  trap: "#f59e0b",
};

/**
 * The 2×2: perceived value (up) against cost + effort (right). One component,
 * three homes — estimator verdict, dashboard portfolio, landing glimpse.
 */
export function QuadrantPlot({
  points,
  highlightId,
  className,
  labelSize = 8,
}: {
  points: QuadrantPoint[];
  highlightId?: string;
  className?: string;
  labelSize?: number;
}) {
  const W = 240;
  const H = 190;
  const pad = { left: 10, right: 10, top: 16, bottom: 22 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const px = (x: number) => pad.left + x * plotW;
  const py = (y: number) => pad.top + (1 - y) * plotH;

  const divX = px(QUADRANT_DIVIDERS.x);
  const divY = py(QUADRANT_DIVIDERS.y);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full", className)}
      role="img"
      aria-label="Value against cost and effort quadrant"
    >
      {/* frame */}
      <rect
        x={pad.left}
        y={pad.top}
        width={plotW}
        height={plotH}
        fill="none"
        stroke="hsl(240 4% 18%)"
        strokeWidth="1"
      />
      {/* dividers */}
      <line
        x1={divX}
        y1={pad.top}
        x2={divX}
        y2={pad.top + plotH}
        stroke="hsl(240 4% 24%)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line
        x1={pad.left}
        y1={divY}
        x2={pad.left + plotW}
        y2={divY}
        stroke="hsl(240 4% 24%)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      {/* corner labels */}
      <text x={pad.left + 5} y={pad.top + 11} fontSize={labelSize} fill="#10b981" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Quick win
      </text>
      <text x={pad.left + plotW - 5} y={pad.top + 11} fontSize={labelSize} fill="#a1a1aa" textAnchor="end" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Strategic bet
      </text>
      <text x={pad.left + 5} y={pad.top + plotH - 6} fontSize={labelSize} fill="#71717a" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Filler
      </text>
      <text x={pad.left + plotW - 5} y={pad.top + plotH - 6} fontSize={labelSize} fill="#f59e0b" textAnchor="end" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Trap
      </text>
      {/* axis captions */}
      <text x={pad.left} y={H - 8} fontSize={labelSize} fill="#71717a">
        cost + effort →
      </text>
      <text x={W - pad.right} y={H - 8} fontSize={labelSize} fill="#71717a" textAnchor="end">
        ↑ perceived value
      </text>
      {/* points */}
      {points.map((p) => {
        // Nudge coordinates off the exact frame edges so dots stay visible.
        const cx = px(0.06 + p.x * 0.88);
        const cy = py(0.08 + p.y * 0.84);
        const highlighted = p.id === highlightId;
        return (
          <g key={p.id}>
            {highlighted && (
              <circle cx={cx} cy={cy} r={9} fill="none" stroke={DOT_COLORS[p.verdict]} strokeWidth="1" opacity="0.5" />
            )}
            <circle
              cx={cx}
              cy={cy}
              r={highlighted ? 5 : 4}
              fill={DOT_COLORS[p.verdict]}
              stroke="#09090b"
              strokeWidth="1"
              strokeDasharray={p.measured === false ? "2 2" : undefined}
            >
              <title>{p.name}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
