import dayjs from 'dayjs';
import React, { useEffect, useMemo } from 'react';
import { ArticlesContextType, IArticle } from '@types';

type Props = {
    children: React.ReactNode;
};

const ArticlesContext = React.createContext<ArticlesContextType | null>(null);

const ArticlesContextProvider: React.FC<Props> = ({ children }) => {
    const [articles, setArticles] = React.useState<IArticle[]>([]);

    const url: URL = useMemo(() => {
        const url = new URL('/articles', 'https://api.stockoffthepress.com/');
        url.searchParams.append(
            'from',
            dayjs().subtract(7, 'days').format('YYYY-MM-DD')
        );
        return url;
    }, []);

    useEffect(() => {
        const fetchArticles = () => {
            fetch(url)
                .then((res) => res.json())
                .then((articles) => setArticles(articles))
                .catch((err) => console.log('An error occured.'));
        };

        fetchArticles();
    }, [url]);

    return (
        <ArticlesContext.Provider value={{ articles }}>
            {children}
        </ArticlesContext.Provider>
    );
};

export { ArticlesContext, ArticlesContextProvider };
