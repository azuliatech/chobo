/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [require("nativewind/preset")],
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
              // Greens
              primary: '#16A34A',
              primaryDark: '#15803D',
              primaryLight: '#DCFCE7',

              // Yellows
              accent: '#FACC15',
              accentLight: '#FEF9C3',

              // Blues
              info: '#2563EB',
              infoLight: '#DBEAFE',

              // Reds
              danger: '#EF4444',
              dangerLight: '#FEE2E2',

              // Backgrounds
              bgDark: '#0F172A',
              surfaceDark: '#1E293B',
              bgLight: '#F8FAFC',
              cardSurface: '#FFFFFF',

              // Borders & Text
              border: '#E5E7EB',
              textPrimary: '#0F172A',
              textSecondary: '#64748B',
            },
            borderRadius: {
                "DEFAULT": "4px",
                "lg": "8px",
                "xl": "12px",
                "full": "9999px"
            },
            spacing: {
                sectionPadding: "24px",
                stackGap: "16px",
                touchTargetMin: "48px",
                gridGutter: "12px",
                screenMargin: "16px"
            }
        }
    },
    plugins: [],
}
