import GoogleProvider from 'next-auth/providers/google';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Doctor from '@/models/Doctor';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        try {
          await connectDB();
          
          // Check if user already exists
          let existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            // Create new user from Google OAuth using static method
            const newUserData = {
              name: user.name,
              email: user.email,
              role: 'patient', // Always default to patient for new OAuth users
              provider: 'google',
              providerId: account.providerAccountId,
              avatar: user.image || null,
            };
            
            console.log('Creating new OAuth user with data (role: patient):', newUserData);
            
            try {
              existingUser = await User.createOAuthUser(newUserData);
              
              console.log('New user created via Google OAuth:', {
                id: existingUser._id,
                name: user.name,
                email: user.email,
                role: 'patient',
                provider: 'google'
              });
            } catch (validationError) {
              console.error('User creation failed:', validationError);
              console.error('Validation errors:', validationError.errors);
              throw validationError;
            }
          } else {
            // Update existing user with Google provider info if not already set
            console.log('Found existing user:', { 
              id: existingUser._id, 
              email: existingUser.email, 
              provider: existingUser.provider 
            });
            
            if (existingUser.provider === 'local' || !existingUser.provider) {
              // Update local user to add Google OAuth info
              existingUser.provider = 'google';
              existingUser.providerId = account.providerAccountId;
              if (user.image && !existingUser.avatar) {
                existingUser.avatar = user.image;
              }
              existingUser.isVerified = true; // Google accounts are verified
              // Keep existing role for users who already had accounts
              
              try {
                await existingUser.save();
                console.log('Updated existing user with Google OAuth info, keeping role:', existingUser.role);
              } catch (updateError) {
                console.error('Error updating existing user:', updateError);
                throw updateError;
              }
            }
          }
          
          return true;
        } catch (error) {
          console.error('Error during Google OAuth sign-in:', error);
          return false;
        }
      }
      return true;
    },
    
    async jwt({ token, user, account }) {
      if (account && user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role;
            token.isAdmin = dbUser.isAdmin || false;
            console.log('JWT callback: User role set to', dbUser.role);
          }
        } catch (error) {
          console.error('Error in JWT callback:', error);
        }
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.isAdmin = token.isAdmin;
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      console.log('NextAuth redirect called with:', { url, baseUrl });
      
      // If redirecting to register page after OAuth, redirect to success instead
      if (url.includes('/register')) {
        console.log('Preventing redirect to register, going to auth success instead');
        return `${baseUrl}/auth/success`;
      }
      
      // For any OAuth callback or relative URL that includes auth/success, allow it
      if (url.includes('/auth/success')) {
        console.log('Allowing redirect to success page');
        return url.startsWith('/') ? `${baseUrl}${url}` : url;
      }
      
      // For Google OAuth callbacks, always redirect to success page
      if (url.includes('/api/auth/callback/google')) {
        console.log('Google OAuth callback, redirecting to success page');
        return `${baseUrl}/auth/success`;
      }
      
      // For signin callbacks, redirect to success page
      if (url.includes('/api/auth/signin')) {
        console.log('Sign in callback, redirecting to success page');
        return `${baseUrl}/auth/success`;
      }
      
      // For NextAuth API routes, let them proceed
      if (url.includes('/api/auth/') && !url.includes('callback') && !url.includes('signin')) {
        console.log('NextAuth API route, allowing:', url);
        return url;
      }
      
      // For dashboard URLs, allow them
      if (url.includes('/dashboard')) {
        return url.startsWith('/') ? `${baseUrl}${url}` : url;
      }
      
      // For relative URLs, prepend base URL
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // For same origin URLs, allow them
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Default: redirect to auth success page
      console.log('Default redirect to auth success');
      return `${baseUrl}/auth/success`;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};