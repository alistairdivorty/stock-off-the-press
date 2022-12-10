from argparse import ArgumentParser

parser = ArgumentParser()
parser.add_argument("message", type=str)


def main():
    args = parser.parse_args()
    print(args.message)


if __name__ == "__main__":
    main()
