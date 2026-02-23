FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && if [ \"$SEED_DEMO_DATA\" = \"true\" ]; then python manage.py seed_demo_data; fi && python manage.py runserver 0.0.0.0:8000 --noreload"]
