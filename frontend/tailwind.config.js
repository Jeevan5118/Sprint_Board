/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
            },
            colors: {
                primary: {
                    blue: '#2563eb', // bg-blue-600
                },
                success: {
                    green: '#10b981', // bg-emerald-500
                },
                warning: {
                    amber: '#f59e0b', // bg-amber-500
                },
                danger: {
                    red: '#f43f5e', // bg-rose-500
                }
            }
        },
    },
    plugins: [],
}
