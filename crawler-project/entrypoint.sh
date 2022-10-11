#!/bin/bash --login
# --login ensures bash configuration is loaded,
# enabling Conda.

# enable discovery of Scrapy config file
export PYTHONPATH="/usr/src/app:$PYTHONPATH"

# enable strict mode
set -euo pipefail

# temporarily disable strict mode
set +euo pipefail

# activate Conda environment
conda activate crawler

# re-enable strict mode
set -euo pipefail

# execute commands
exec "$@"