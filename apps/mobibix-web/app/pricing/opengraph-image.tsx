import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", width: "100%", height: "100%",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: "linear-gradient(135deg, #14b8a6, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, color: "white", fontWeight: "bold",
          }}>M</div>
          <span style={{ color: "white", fontSize: 36, fontWeight: "bold", letterSpacing: "0.1em" }}>
            MobiBix
          </span>
        </div>
        <p style={{ color: "#94a3b8", fontSize: 26, fontWeight: "bold", margin: 0 }}>
          Simple Pricing for Mobile Shop Owners
        </p>
        <p style={{ color: "#64748b", fontSize: 18, marginTop: 12, marginBottom: 0 }}>
          Start Free. No credit card required.
        </p>
        <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
          {["Zero Setup Cost", "14-Day Free Trial", "Cancel Anytime"].map((f) => (
            <div key={f} style={{
              padding: "8px 16px", borderRadius: 8,
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.3)",
              color: "#5eead4", fontSize: 14,
            }}>{f}</div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
