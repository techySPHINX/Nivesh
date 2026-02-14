# Nivesh Frontend

This is the Next.js frontend application for **Nivesh - Your AI Financial Strategist**.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local with your Firebase and API credentials

# Run development server
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) to view the application.

## 📦 Tech Stack

- **Next.js 16** (App Router with React 19)
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Firebase** for authentication
- **Axios** for API requests
- **Socket.IO** for real-time chat
- **Recharts** for data visualization
- **Radix UI** for accessible components

## 📁 Project Structure

```
frontend/
├── app/                  # Next.js App Router pages
│   ├── (auth)/          # Auth pages (login, signup)
│   └── (dashboard)/     # Protected dashboard routes
├── components/          # Reusable React components
├── contexts/           # React Context providers
├── lib/                # Utilities and helpers
│   ├── api/           # API client and services
│   ├── firebase.ts    # Firebase configuration
│   └── websocket.ts   # WebSocket manager
└── types/             # TypeScript type definitions
```

## 🔑 Environment Variables

Create `.env.local` from `.env.local.example` and configure:

- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL  
- Firebase configuration keys

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Firebase Auth](https://firebase.google.com/docs/auth)

## 🛠️ Development

```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm lint     # Run ESLint
```

For detailed setup instructions, see [../SETUP_GUIDE.md](../SETUP_GUIDE.md).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
