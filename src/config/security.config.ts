export namespace SecurityConfiguration {
  export const userDb = process.env.USER_DB;
  export const passwordDb = process.env.PASSWORD_DB;
  export const dataBase = process.env.DATABASE;
  export const hostDb = process.env.HOST_DB;
  export const PORT_DB = process.env.PORT_DB;
  export const securityMicroserviceLink: string = 'http://localhost:3000';

  export const menus = {
    menuPropertyId: '642d9df302e1597baa66e444',
  };
  export const actions = {
    listAction: 'list',
    createAction: 'create',
    editAction: 'edit',
    removeAction: 'remove',
    downloadAction: 'download',
    assignAction: 'assign',
    upuploadActionload: 'upload',
  };
}
