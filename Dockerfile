FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Node.js stage for Tailwind CSS build
COPY package.json package-lock.json* ./
RUN npm ci

COPY *.csproj .
RUN dotnet restore

COPY . .
RUN npx tailwindcss -i tailwind-input.css -o wwwroot/css/site.css --minify
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
EXPOSE 80
EXPOSE 443

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:80

ENTRYPOINT ["dotnet", "Klacks.Marketing.dll"]
