export async function createPost(status) {
  return {
    content: [
      {
        type: "text",
        text: `Post created: ${status}`
      }
    ]
  };
}
