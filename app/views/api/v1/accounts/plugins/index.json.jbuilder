json.array! @plugins do |plugin|
  json.id plugin.id
  json.name plugin.name
  json.identifier plugin.identifier
  json.version plugin.version
  json.description plugin.description
  json.author plugin.author
  # The frontend will use the identifier to load `/plugins/:identifier/frontend/dist/plugin.js`
end
