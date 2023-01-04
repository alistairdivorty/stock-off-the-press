import Layout from '@/components/Layout';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Montserrat } from '@next/font/google';
import { ArticlesContextProvider } from '@/context/articlesContext';

const montserrat = Montserrat({
    subsets: ['latin'],
    variable: '--font-montserrat',
});

export default function App({ Component, pageProps }: AppProps) {
    return (
        <main className={`${montserrat.variable} font-sans`}>
            <ArticlesContextProvider>
                <Layout>
                    <Component {...pageProps} />
                </Layout>
            </ArticlesContextProvider>
        </main>
    );
}
