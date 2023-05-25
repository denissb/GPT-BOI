build:
	docker build -t gpt-boi .

run:
	docker run -d -p 3000:3000 --name gpt-boi --rm gpt-boi
