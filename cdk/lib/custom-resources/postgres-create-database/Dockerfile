FROM public.ecr.aws/lambda/python:3.9

RUN pip install psycopg2-binary

COPY handler.py ${LAMBDA_TASK_ROOT}

CMD [ "handler.on_event" ]