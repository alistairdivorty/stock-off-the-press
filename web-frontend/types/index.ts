export interface IArticle {
    _id: { $oid: string };
    date_published: { $date: string };
    headline: string;
    description: string;
    summary: string;
    exchange: string;
    symbol: string;
    prediction: 'rise' | 'fall';
}

export type ArticlesContextType = {
    articles: IArticle[];
};
