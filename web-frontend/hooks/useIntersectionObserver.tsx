import { useEffect, useState, useRef, RefObject } from 'react';

const useIntersectionObserver = (ref: RefObject<HTMLElement>) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(([entry]) =>
            setIsIntersecting(entry.isIntersecting)
        );
    }, []);

    useEffect(() => {
        if (observerRef?.current && ref?.current) {
            observerRef.current.observe(ref.current);
        }

        return () => {
            if (observerRef?.current) {
                observerRef.current.disconnect();
            }
        };
    }, [ref]);

    return isIntersecting;
}

export default useIntersectionObserver;
