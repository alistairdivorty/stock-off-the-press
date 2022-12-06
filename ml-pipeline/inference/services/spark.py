import os, json
from pathlib import Path
from pyspark import SparkFiles
from pyspark.sql import SparkSession
from inference.services import logger


def start_spark(
    app_name="stock-off-the-press",
    master="local[*]",
    jars_packages=[],
    jars=[],
    driver_extra_classpath=[],
    files=[],
    spark_config={},
):
    """Start Spark session, get Spark logger and load config files."""
    # detect execution environment
    flag_repl = os.isatty(0)
    flag_debug = "DEBUG" in os.environ.keys()

    if not (flag_repl or flag_debug):
        spark_builder = SparkSession.builder.appName(app_name)
    else:
        spark_builder = SparkSession.builder.master(master).appName(app_name)

        # pass external JAR packages to session builer for download
        spark_jars_packages = ",".join(list(jars_packages))
        spark_builder.config("spark.jars.packages", spark_jars_packages)

        # pass local JAR files to session builder
        spark_jars = ",".join(list(jars))
        spark_builder.config("spark.jars", spark_jars)

        # pass extra classpath entries for the driver to session builder
        spark_driver_extra_classpath = ",".join(list(driver_extra_classpath))
        spark_builder.config(
            "spark.driver.extraclasspath", spark_driver_extra_classpath
        )

        # pass local files to session builder
        spark_files = ",".join(list(files))
        spark_builder.config("spark.files", spark_files)

        for key, val in spark_config.items():
            spark_builder.config(key, val)

    spark_sess = spark_builder.getOrCreate()
    spark_logger = logger.Log4j(spark_sess)

    # get config files if sent to cluster with --files
    spark_files_dir = SparkFiles.getRootDirectory()
    config_files = [
        filename
        for filename in os.listdir(spark_files_dir)
        if filename.endswith(".json")
    ]
    config_dict = {}
    for filename in config_files:
        path_ = os.path.join(spark_files_dir, filename)
        with open(path_, "r") as config_file:
            config_dict[Path(filename).stem] = json.load(config_file)

    return spark_sess, spark_logger, config_dict
