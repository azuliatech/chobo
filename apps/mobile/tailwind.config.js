/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                brand: {
                    green: '#16a34a',
                    greenLight: '#22c55e',
                    yellow: '#eab308',
                    dark: '#0f172a',
                    card: '#1e293b',
                }
            }
        },
    },
    plugins: [],
}
