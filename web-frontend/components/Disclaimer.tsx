import clsx from 'clsx';
import Box from '@/components/Box';

interface Props {
    className?: string;
}

const Disclaimer = ({ className }: Props) => (
    <Box heading="Disclaimer" className={clsx(className)}>
        <p className="text-amber-500 text-sm leading-snug font-medium">
            Predictions are provided for demonstration purposes only and do not
            constitute financial, investment or trading advice. No warranties
            are made regarding the accuracy of the model.
        </p>
    </Box>
);

export default Disclaimer;
