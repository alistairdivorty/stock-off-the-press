import clsx from 'clsx';
import dayjs from 'dayjs';
import { IArticle } from '@types';
import Direction from '@/components/Direction';

interface Props {
    article: IArticle;
}

const Article = ({ article }: Props) => (
    <div
        className="w-80 rounded-large overflow-hidden flex flex-col bg-zinc-50"
        style={{ height: '35rem' }}
    >
        <div className="absolute top-0 right-0 translate-x-3 -translate-y-3">
            <div className="rounded-full p-2 bg-sky-100">
                <Direction
                    direction={article.prediction}
                    className={clsx(
                        'w-16',
                        {
                            rise: 'text-blue-700',
                            fall: 'text-pink-700',
                        }[article.prediction]
                    )}
                />
            </div>
        </div>
        <div className="bg-indigo-600 h-1/3 flex justify-center items-center">
            <h3 className="text-white text-xl font-medium">{`${article.exchange}:${article.symbol}`}</h3>
        </div>
        <div className="bg-zinc-800" style={{ height: '0.2rem' }}></div>
        <div className="p-3 flex flex-col flex-1 gap-2">
            <h2 className="text-purple-800 text-lg font-medium">
                {article.headline}
            </h2>
            <h3 className="text-zinc-800 text-sm font-semibold">
                {article.description}
            </h3>
            <p className="text-zinc-800 text-sm flex-1">{article.summary}</p>
        </div>
        <div className="p-3 bg-indigo-600 h-7 flex items-center justify-end">
            <span className="text-white text-xs font-semibold">
                {dayjs(article.date_published.$date).format(
                    'D MMM YYYY, h:mm A'
                )}
            </span>
        </div>
    </div>
);

export default Article;
