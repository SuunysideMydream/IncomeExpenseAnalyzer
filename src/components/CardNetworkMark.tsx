import { CARD_NETWORKS, isCardNetwork } from "../lib/appearance";

export function CardNetworkMark({ network }: { network?: string }) {
  const selected = isCardNetwork(network) ? network : "mastercard";
  if (selected === "none") return null;
  return (
    <svg
      className="card-network-mark"
      data-network={selected}
      viewBox="0 0 64 26"
      fill="currentColor"
      role="img"
      aria-label={CARD_NETWORKS[selected]}
    >
      {selected === "mastercard" && (
        <>
          <circle cx="36" cy="13" r="10.5" opacity=".82" />
          <circle cx="51" cy="13" r="10.5" opacity=".65" />
        </>
      )}
      {selected === "visa" && (
        <text
          x="62"
          y="20"
          textAnchor="end"
          fontFamily="system-ui, sans-serif"
          fontSize="20"
          fontWeight="850"
          fontStyle="italic"
          letterSpacing="-0.7"
        >
          VISA
        </text>
      )}
      {selected === "unionpay" && (
        <>
          <g transform="translate(6 0) skewX(-11)">
            <rect x="7" y="3" width="17" height="20" rx="3" opacity=".24" />
            <rect x="25" y="3" width="17" height="20" rx="3" opacity=".34" />
            <rect x="43" y="3" width="17" height="20" rx="3" opacity=".5" />
          </g>
          <text
            x="34"
            y="17"
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
          >
            UnionPay
          </text>
        </>
      )}
      {selected === "jcb" && (
        <>
          <rect x="21" y="3" width="13" height="20" rx="3" opacity=".25" />
          <rect x="35" y="3" width="13" height="20" rx="3" opacity=".36" />
          <rect x="49" y="3" width="13" height="20" rx="3" opacity=".52" />
          <text
            x="42"
            y="18"
            textAnchor="middle"
            fontSize="14"
            fontWeight="850"
          >
            JCB
          </text>
        </>
      )}
    </svg>
  );
}
