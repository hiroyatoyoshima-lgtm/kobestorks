"use client";

import { useState } from "react";

export interface SettingsTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export default function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  if (tabs.length === 0) return null;
  if (tabs.length === 1) return <>{tabs[0].content}</>;

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="settings-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`settings-tab ${t.id === activeTab.id ? "active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab.content}
    </div>
  );
}
