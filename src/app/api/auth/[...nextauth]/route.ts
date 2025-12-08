import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { SedApiService } from "@/lib/services/sed-api";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
        CredentialsProvider({
            name: "SED",
            credentials: {
                username: { label: "Usuário", type: "text" },
                password: { label: "Senha", type: "password" },
            },
            async authorize(credentials) {
                try {
                    const sedService = new SedApiService();
                    // Use environment variables for authentication
                    const user = process.env.SED_USER;
                    const password = process.env.SED_PASSWORD;

                    if (!user || !password) {
                        console.error("SED credentials not found in environment variables");
                        return null;
                    }

                    const token = await sedService.login(user, password);

                    if (token) {
                        return {
                            id: user,
                            name: "Administrador SED",
                            email: `${user}@educacao.sp.gov.br`,
                            accessToken: token,
                        };
                    }
                    return null;
                } catch (error) {
                    console.error("Login error:", error);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                // If it's a credentials login, it might have an accessToken
                if ((user as any).accessToken) {
                    token.accessToken = (user as any).accessToken;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token.accessToken) {
                (session as any).accessToken = token.accessToken;
            }
            return session;
        },
    },
});

export { handler as GET, handler as POST };
