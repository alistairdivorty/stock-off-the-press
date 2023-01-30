import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import { IArticle } from '@types';
import Article from '@/components/Article';

interface Props {
    articles: IArticle[];
}

const Articles = ({ articles }: Props) => {
    if (typeof window !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    const containerRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        let ctx = gsap.context(() => {
            ScrollTrigger.batch('.article', {
                onEnter: (batch) =>
                    gsap.to(batch, { autoAlpha: 1, stagger: 0.1 }),
                start: 'top bottom-=50',
                end: 'top bottom-=50',
            });

            return () => ctx.revert();
        }, containerRef);
    }, [articles]);

    const articleElements = articles.map((article) => (
        <li key={article._id.$oid} className="article opacity-0">
            <div className="relative">
                <Article article={article} />
            </div>
        </li>
    ));

    return (
        <ul
            ref={containerRef}
            className="min-h-screen grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 font-montserrat"
        >
            {articleElements}
        </ul>
    );
};

export default Articles;
