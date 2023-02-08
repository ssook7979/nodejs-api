export type TPagination = {
  page: number;
  size: number;
};

const pagination = (req: any, res: any, next: any) => {
  const pageAsNumber = Number.parseInt(req.query.page);
  const sizeAsNumber = Number.parseInt(req.query.size);

  let page = Number.isNaN(pageAsNumber) ? 0 : Number.parseInt(req.query.page);
  if (page < 0) {
    page = 0;
  }
  let size = Number.isNaN(sizeAsNumber) ? 0 : Number.parseInt(req.query.size);
  if (size > 10 || size < 1) {
    size = 10;
  }
  req.pagination = { size, page };
  next();
};

export default pagination;
