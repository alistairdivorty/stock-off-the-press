import React from 'react';
import clsx from 'clsx';

interface Props {
    children: React.ReactNode;
    heading: string;
    className?: string;
}

const Box = ({ children, heading, className }: Props) => (
    <div
        className={clsx(
            className,
            'relative rounded-md border border-indigo-500 p-4'
        )}
    >
        <div className="absolute flex justify-center w-full top-0 inset-x-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="px-2 bg-zinc-800 text-slate-100 uppercase text-base text-zinc-50 font-semibold">
                {heading}
            </div>
        </div>
        {children}
    </div>
);

export default Box;
