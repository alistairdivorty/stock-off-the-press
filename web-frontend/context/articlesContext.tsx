import React, { useEffect } from 'react';
import { ArticlesContextType, IArticle } from '@types';

type Props = {
    children: React.ReactNode;
};

const ArticlesContext = React.createContext<ArticlesContextType | null>(null);

const ArticlesContextProvider: React.FC<Props> = ({ children }) => {
    const [articles, setArticles] = React.useState<IArticle[]>([]);

    useEffect(() => {
        const fetchArticles = () => {
            fetch('https://api.stockoffthepress.com/articles/')
                .then((res) => res.json())
                .then((articles) => setArticles(articles))
                .catch((err) => console.log('An error occured.'));
        };

        fetchArticles();
    }, []);

    return (
        <ArticlesContext.Provider value={{ articles }}>
            {children}
        </ArticlesContext.Provider>
    );
};

export { ArticlesContext, ArticlesContextProvider };
