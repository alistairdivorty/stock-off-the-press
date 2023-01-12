import { useRef, ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';

interface Props {
    children: ReactNode;
}

const Layout = ({ children }: Props) => {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const isIntersecting = useIntersectionObserver(sentinelRef);

    return (
        <>
            <Header scrolled={!isIntersecting} />
            <div ref={sentinelRef} />
            <main>{children}</main>
            <Footer />
        </>
    );
};

export default Layout;
