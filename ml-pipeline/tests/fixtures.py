import pytest, os
from distutils.util import strtobool
from dotenv import load_dotenv, find_dotenv
from inference.services.spark import start_spark

load_dotenv(find_dotenv(), override=True)


@pytest.fixture(scope="session")
def spark():
    sparknlp_artifact_id = {
        0: "spark-nlp_2.12",
        1: "spark-nlp-m1_2.12",
    }[strtobool(os.environ["MAC_M1"])]

    spark, *_ = start_spark(
        jars_packages=[
            "org.apache.hadoop:hadoop-aws:3.3.2",
            "org.mongodb.spark:mongo-spark-connector_2.12:3.0.2",
            f"com.johnsnowlabs.nlp:{sparknlp_artifact_id}:4.2.1",
        ],
        spark_config={
            "spark.mongodb.input.uri": os.environ["MONGODB_CONNECTION_URI"],
            "spark.mongodb.output.uri": os.environ["MONGODB_CONNECTION_URI"],
            "fs.s3a.aws.credentials.provider": "com.amazonaws.auth.DefaultAWSCredentialsProviderChain",
            "spark.kryoserializer.buffer.max": "2000M",
            "spark.driver.memory": "10g",
        },
    )

    yield spark

    spark.stop()


@pytest.fixture
def article():
    return (
        "Baker Hughes has reported a drop in revenues and widening losses as "
        "a result of supply chain issues and the suspension of its Russian "
        "operations, prompting a sharp sell-off in the American oilfield "
        "services group. Shares in Baker Hughes — one of the biggest providers "
        "of equipment and services to the global oil and gas industry — "
        "tumbled as much as 13 per cent on Wednesday after the company "
        "reported disappointing second-quarter earnings. The shares recovered "
        "slightly to end the day 8.3 per cent lower. The Texas-based company "
        "said revenue fell 2 per cent from the previous year to $5bn, while "
        "a net loss of $839mn was significantly wider than the $68mn loss "
        "recorded in the same period last year. The numbers were well short "
        "of Wall Street expectations. Chief executive Lorenzo Simonelli said "
        "the results reflected challenges including component shortages, "
        "supply chain inflation and its Russia operations being suspended. "
        "The obstacles offset the benefits of surging demand in America’s "
        "shale fields as companies scramble to increase production in a "
        "tight oil market. Rival Halliburton on Tuesday posted a bumper "
        "quarter driven by what chief Jeff Miller described as an “all but "
        "sold-out” US and Canadian market. Halliburton, Schlumberger and "
        "Baker Hughes — the three biggest oilfield services groups globally "
        "— were all slow to decamp from Russia as many western "
        "multinationals rushed for the exit following Moscow’s invasion of "
        "Ukraine. Baker Hughes suspended new investments in Russia in March "
        "after the US government imposed sanctions on foreign financing. "
        "The company booked a $365mn impairment charge on Wednesday "
        "relating to its Russia operations as it works out how to offload "
        "them. It said the business was now “held for sale” and was "
        "considering options including an outright sale or a management "
        "buyout. Income was also squeezed by lengthy delays in shipments of "
        "parts, including chips and electronics, affecting its ability to "
        "complete orders for some customers. “We’re sitting at 60 per cent "
        "on-time delivery from our suppliers of electronics and chips to us,” "
        "chief financial officer Brian Worrell told analysts on Tuesday. "
        "“And it’s been stable at that 60 per cent for some time.” He said "
        "the delays have more than doubled from the third quarter of last "
        "year, from 11 days to 25. The company also sounded a cautious note "
        "about the outlook for the industry as the threat of a global "
        "recession looms. “The demand outlook for the next 12 to 18 months "
        "is deteriorating, as inflation erodes consumer purchasing power "
        "and central banks aggressively raise interest rates to combat "
        "inflation,” Simonelli said. Years of under-investment and the "
        "isolation of Russia could still support oil prices even if demand "
        "drops, he added."
    )
