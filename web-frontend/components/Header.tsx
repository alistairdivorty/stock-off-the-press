import React from 'react';
import clsx from 'clsx';

interface Props {
    scrolled: boolean;
}

const Header = ({ scrolled }: Props) => {
    return (
        <header
            className={clsx(
                'fixed top-0 w-screen text-white z-20 transition-colors duration-300',
                {
                    'bg-black': !scrolled,
                    'bg-zinc-800': scrolled,
                }
            )}
        >
            <div className="p-4">
                <div>
                    <span className="text-6xl font-serif font-extrabold tracking-tight">
                        Stock.
                    </span>
                </div>
                <div>
                    <span className="text-2xl font-monserrat font-light leading-none">
                        Off The Press
                    </span>
                </div>
            </div>
        </header>
    );
};

export default Header;
