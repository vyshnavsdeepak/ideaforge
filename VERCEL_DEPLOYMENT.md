# Vercel Deployment Guide

## 🚀 Quick Deployment

1. **Fork/Clone Repository**
   ```bash
   git clone https://github.com/your-username/ideaforge.git
   cd ideaforge
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Database**
   - Create a free PostgreSQL database on [Neon](https://neon.tech)
   - Run database migrations:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
   
   **Note**: Prisma Client is automatically generated during build via `postinstall` script.

4. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Configure environment variables (see below)
   - Deploy!

## 🔧 Environment Variables

Configure these in your Vercel dashboard:

### Required Variables
```env
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secret-key-here"
ADMIN_PASSWORD="your-admin-password"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"
```

### Optional Variables
```env
REDDIT_CLIENT_ID="your-reddit-client-id"
REDDIT_CLIENT_SECRET="your-reddit-client-secret"
REDDIT_USER_AGENT="YourApp/1.0.0"
```

## 🔐 Authentication Setup

1. **Generate NextAuth Secret**
   ```bash
   openssl rand -base64 32
   ```

2. **Set Admin Password**
   - Choose a strong password for admin access
   - Set it in `ADMIN_PASSWORD` environment variable

3. **Configure NextAuth URL**
   - Set `NEXTAUTH_URL` to your Vercel deployment URL
   - Example: `https://your-app.vercel.app`

## 🤖 AI Service Setup

1. **Get Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Generate a new API key
   - Add it to `GOOGLE_GENERATIVE_AI_API_KEY`

## 📊 Database Setup

1. **Create Neon Database**
   - Sign up at [Neon.tech](https://neon.tech)
   - Create a new database
   - Copy the connection string

2. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

## ⚙️ Inngest Setup

1. **Create Inngest Account**
   - Sign up at [Inngest.com](https://inngest.com)
   - Create a new app
   - Get your event key and signing key

2. **Configure Webhook**
   - Add webhook URL: `https://your-app.vercel.app/api/inngest`
   - This enables scheduled jobs to run

## 📅 Scheduled Jobs

The app includes these automated schedules:

- **Peak Activity**: Every 30 minutes (9 AM - 1 PM EST)
- **Daily Comprehensive**: Once daily at 2 PM EST
- **Real-time Hot**: Every 10 minutes
- **Weekend Discovery**: Saturday at 10 AM EST

## 🔒 Security

- **No signup allowed** - Only admin can authenticate with password
- **Protected admin dashboard** - Requires authentication to access
- **Protected API routes** - Manual scraping requires authentication
- **Public opportunities view** - Anyone can view discovered opportunities
- **Environment variables** - Sensitive data secured
- **Middleware protection** - Routes automatically protected

## 📱 Usage

1. **Access Admin**: Visit `/dashboard` with admin password
2. **View Opportunities**: Visit `/opportunities` (public)
3. **Manual Trigger**: Use admin dashboard to trigger scraping
4. **Monitor**: Check Inngest dashboard for job status

## 🐛 Troubleshooting

### Common Issues

1. **Prisma Client Error on Vercel**
   - **Issue**: "Prisma has detected that this project was built on Vercel..."
   - **Solution**: The `postinstall` script automatically runs `prisma generate`
   - **Manual fix**: Run `npx prisma generate` and redeploy

2. **Database Connection**
   - Check `DATABASE_URL` format
   - Ensure database allows connections
   - Run `npx prisma db push` if needed

3. **Authentication Issues**
   - Verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL`
   - Check admin password is set correctly
   - Ensure no signup is enabled (only admin access)

4. **Scheduled Jobs Not Running**
   - Verify Inngest webhook is configured
   - Check event key and signing key
   - Monitor Inngest dashboard for errors

5. **AI Analysis Failing**
   - Confirm Gemini API key is valid
   - Check API quota limits
   - Monitor application logs

### Debugging

1. **Check Vercel Logs**
   ```bash
   vercel logs your-app
   ```

2. **Database Connection**
   ```bash
   npx prisma db push
   npx prisma studio
   ```

3. **Test API Endpoints**
   - `/api/health` - Health check
   - `/api/inngest` - Inngest webhook
   - `/api/auth/signin` - Authentication

## 🎯 Post-Deployment

1. **Test Authentication**
   - Visit `/dashboard`
   - Sign in with admin password

2. **Trigger Test Scraping**
   - Use manual trigger button
   - Check opportunities appear

3. **Monitor Schedules**
   - Check Inngest dashboard
   - Verify jobs run on schedule

4. **Review Opportunities**
   - Visit `/opportunities`
   - Confirm AI analysis working

## 📈 Scaling

- **Free Tier**: Suitable for personal use
- **Pro Tier**: For higher volume scraping
- **Database**: Neon scales automatically
- **AI**: Gemini has generous free tier

## 🔄 Updates

To update the app:
1. Push changes to GitHub
2. Vercel auto-deploys
3. Run migrations if schema changed
4. Update environment variables if needed