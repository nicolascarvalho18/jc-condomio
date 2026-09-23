# ==============================================================================
# Dockerfile Backend - JC Condomínio (Spring Boot 3 + Java 21)
# Multi-stage build para segurança e imagem enxuta em produção
# ==============================================================================

# Estágio 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build

COPY .mvn .mvn
COPY mvnw mvnw.cmd pom.xml ./
RUN chmod +x mvnw

# Baixa dependências em cache
RUN ./mvnw dependency:go-offline -B

# Copia código-fonte e compila sem testes para agilizar imagem
COPY src src
RUN ./mvnw clean package -DskipTests -B

# Estágio 2: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Usuário sem privilégios de root para segurança
RUN addgroup -S jcgroup && adduser -S jcuser -G jcgroup
USER jcuser

COPY --from=builder /build/target/jccondomio-backend-*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
