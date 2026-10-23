import { ExperienceShell } from "@/components/interface/ExperienceShell";
import { company, services } from "@/data/company-content";

export default function Page() {
  return (
    <>
      <ExperienceShell />
      <noscript>
        <div style={{ position: "fixed", inset: 0, background: "#0b1630", color: "#fff", padding: 32, fontFamily: "system-ui, sans-serif", overflow: "auto" }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>{company.name}</h1>
          <p style={{ maxWidth: 640, lineHeight: 1.6 }}>{company.description}</p>
          <h2 style={{ fontSize: 20, marginTop: 24 }}>Services</h2>
          <ul>
            {services.map((s) => (
              <li key={s.id}>
                <strong>{s.title}</strong> — {s.summary}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 24 }}>
            The interactive 3D office needs JavaScript. Contact us at <a style={{ color: "#9fb7ff" }} href={`mailto:${company.email}`}>{company.email}</a>.
          </p>
        </div>
      </noscript>
    </>
  );
}
