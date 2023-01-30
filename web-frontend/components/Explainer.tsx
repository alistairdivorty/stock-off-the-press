import clsx from 'clsx';
import Box from '@/components/Box';

interface Props {
    className?: string;
}

const Explainer = ({ className }: Props) => (
    <Box heading="How It Works" className={clsx(className)}>
        <div className="text-zinc-50 text-xs space-y-1.5 pt-1">
            <p>
                Decision trees are a type of machine learning algorithm that
                predict a target label for previously unseen data based on
                decision rules learned during the training stage. The
                predictions of multiple decision trees are synthesised into more
                reliable predictions using a technique called gradient boosting.
            </p>
            <p>
                The inputs to the classifier model are text embeddings – vectors
                that encode the conceptual similarity between texts through
                their location in a &quot;semantic space&quot; produced by a
                model trained on a large corpus of unlabelled data by requiring
                the model to predict masked words based on their context.
            </p>
            <p>
                The model was trained on 15 years&apos; worth of historical
                data. When evaluated against a subset of the historical data,
                the model was found to achieve an accuracy rate of ~77%. The
                technology is highly experimental, and is presented here for
                demonstration purposes only.{' '}
                <span className="font-semibold">
                    Model predictions should not be used to inform investment or
                    trading decisions.
                </span>
            </p>
        </div>
    </Box>
);

export default Explainer;
