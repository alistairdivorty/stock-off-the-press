class Log4j:
    """Wrapper class for Log4j JVM object"""

    def __init__(self, spark):
        sc = spark.sparkContext

        conf = sc.getConf()
        app_id = conf.get("spark.app.id")
        app_name = conf.get("spark.app.name")

        log4j = spark._jvm.org.apache.log4j
        message_prefix = f"<{app_name} {app_id}>"
        self.logger = log4j.LogManager.getLogger(message_prefix)

    def error(self, message) -> None:
        self.logger.error(message)

    def warn(self, message) -> None:
        self.logger.warn(message)

    def info(self, message) -> None:
        self.logger.info(message)
