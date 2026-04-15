.PHONY: content ingest seed translate validate

# Genera todo el contenido en secuencia
content: ingest seed translate validate

# Descarga estructura de HashiCorp + notas de ismet55555 + labs de btkrausen
ingest:
	npm run ingest:all

# Genera explicaciones "para dummies" con Claude Haiku (requiere ANTHROPIC_API_KEY)
seed:
	npm run seed:explainers

# Traduce notas técnicas EN → ES con Claude Haiku (requiere ANTHROPIC_API_KEY)
translate:
	npm run translate:notes

# Valida que el frontmatter de todo el contenido sea correcto
validate:
	npm run content:validate
