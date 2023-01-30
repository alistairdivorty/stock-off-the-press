import Head from 'next/head';
import Hero from '@/components/Hero';
import Key from '@/components/Key';
import Disclaimer from '@/components/Disclaimer';
import Explainer from '@/components/Explainer';
import Articles from '@/components/Articles';
import useArticlesContext from '@/hooks/useArticlesContext';

export default function Home() {
    const { articles } = useArticlesContext() ?? {};

    return (
        <>
            <Head>
                <title>Stock Off The Press</title>
                <meta
                    name="description"
                    content="A model for predicting the effect of news stories on stock prices."
                />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="bg-zinc-800 grid gap-12 place-items-center pb-10">
                <Hero />
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10">
                    <Explainer className="w-80 lg:w-[30rem] lg:place-self-stretch" />
                    <Key className="w-80" />
                </div>
                <Disclaimer className="w-80 lg:w-auto max-w-lg" />
                <div className="w-full flex justify-center">
                    <div className="m-6">
                        <Articles articles={articles ?? []} />
                    </div>
                </div>
            </main>
        </>
    );
}
