# Next.js Better Auth Starter

A complete authentication starter template built with **Next.js 15**, **Better Auth**, **Prisma ORM**, **PostgreSQL**, and **Nodemailer**. This template provides all the essential authentication features you need to get started quickly with your next project.

## 🚀 Features

### 🔐 Authentication Methods

- **Email & Password** - Traditional signup/login with email verification
- **Magic Link** - Passwordless authentication via email
- **OAuth** - Social login with Google and GitHub
- **Admin Panel** - User management with role-based access

### 📧 Email Features

- **Email Verification** - Verify email addresses on signup
- **Password Reset** - Secure password reset flow
- **Magic Link Login** - One-click login via email

### 👤 User Management

- **User Profiles** - Update name, email, and password
- **Role-based Access** - User and Admin roles with permissions
- **Account Linking** - Link multiple OAuth accounts
- **Session Management** - Secure session handling with cookies

### 🛡️ Security Features

- **Password Hashing** - Argon2 encryption for passwords
- **CSRF Protection** - Built-in CSRF protection
- **Secure Cookies** - HTTP-only, secure cookies
- **Email Validation** - Domain-based email validation
- **Name Validation** - Custom name validation rules

### 🎨 UI Components

- **Responsive Design** - Mobile-first responsive design
- **Modern UI** - Built with Tailwind CSS and Radix UI
- **Toast Notifications** - User feedback with Sonner
- **Loading States** - Proper loading indicators
- **Form Validation** - Client-side and server-side validation

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Authentication**: Better Auth
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Styling**: Tailwind CSS + Shadcn/ui
- **Email**: Nodemailer

## 📦 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- SMTP email service (Gmail, SendGrid, etc.)

### Installation

**Environment Setup**
   Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/your_db_name"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_API_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email (Nodemailer)
NODEMAILER_HOST="smtp.gmail.com"
NODEMAILER_PORT="587"
NODEMAILER_USER="your-email@gmail.com"
NODEMAILER_PASS="your-app-password"

# Admin Emails (semicolon separated)
ADMIN_EMAILS="admin@example.com;admin2@example.com"
```

**Database Setup**

```bash
# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push
```

**Run the development server**

```bash
npm run dev
```


## 📁 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin dashboard
│   ├── profile/           # User profile
│   └── api/auth/          # Better Auth API routes
├── components/            # Reusable components
│   ├── ui/               # UI components (shadcn/ui)
│   ├── *-form.tsx        # Authentication forms
│   └── *.tsx             # Other components
├── actions/               # Server actions
├── lib/                   # Utility functions
│   ├── auth.ts           # Better Auth configuration
│   ├── auth-client.ts    # Client-side auth
│   └── prisma.ts         # Prisma client
└── middleware.ts          # Route protection
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Thanks & Acknowledgements

- [Better Auth](https://www.better-auth.com/) - Amazing authentication library
- [Next.js](https://nextjs.org/) - The React framework
- [Prisma](https://prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Radix UI](https://radix-ui.com/) - Low-level UI primitives

##

- Special thanks to Khurram Ali ([GiraffeReactor](https://www.youtube.com/@GiraffeReactor)) for his amazing tutorial that helped build this project. His detailed walkthrough and guidance were invaluable.
