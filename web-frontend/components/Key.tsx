import clsx from 'clsx';
import Box from '@/components/Box';
import Direction from '@/components/Direction';

interface Props {
    className?: string;
}

const Key = ({ className }: Props) => (
    <Box heading="Key" className={clsx(className)}>
        <div className="grid grid-cols-2 gap-4 place-items-center">
            <div className="rounded-full p-2 bg-sky-100">
                <Direction
                    direction="rise"
                    className="w-16 h-16 text-blue-700"
                />
            </div>
            <div className="text-sm font-medium leading-snug text-zinc-50">
                Stock predicted to be trading higher in 7 days
            </div>
            <div className="rounded-full p-2 bg-sky-100">
                <Direction
                    direction="fall"
                    className="w-16 h-16 text-pink-700"
                />
            </div>
            <div className="text-sm font-medium leading-snug text-zinc-50">
                Stock predicted to be trading lower in 7 days
            </div>
        </div>
    </Box>
);

export default Key;
