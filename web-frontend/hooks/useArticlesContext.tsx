import { useContext } from 'react';
import { ArticlesContext } from '@/context/articlesContext';

const useArticlesContext = () => {
    return useContext(ArticlesContext);
};

export default useArticlesContext;