export const createProjectEventBody = ({ files = [], ...fields }) => {
  if (!files.length) return fields;

  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.append(key, value);
  });
  files.forEach((file) => body.append("files", file));
  return body;
};
