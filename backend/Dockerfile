FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package

FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system shop \
    && useradd --system --gid shop --no-create-home shop
WORKDIR /app
COPY --from=build /app/target/shopsphere-1.0.0.jar app.jar
USER shop
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
