import {BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {configurationNotification} from '../config/notification.config';
import {Advisor, Property, Request as RequestModel} from '../models';
import {
  AdvisorRepository,
  CustomerRepository,
  PropertyRepository,
  RequestRepository,
} from '../repositories';
import {NotificationService} from './notification.service';

@injectable({scope: BindingScope.TRANSIENT})
export class CustomerRequestService {
  constructor(
    @repository(AdvisorRepository)
    protected advisorRepository: AdvisorRepository,
    @repository(CustomerRepository)
    protected customerRepository: CustomerRepository,
    @repository(PropertyRepository)
    protected propertyRepository: PropertyRepository,
    @repository(RequestRepository)
    protected requestRepository: RequestRepository,
    @service(NotificationService)
    protected notificationService: NotificationService,
  ) {}

  public async getRequestsByCustomer(
    customerId: number,
  ): Promise<RequestModel[]> {
    const requests = await this.customerRepository.requests(customerId).find({
      fields: [
        'id',
        'creationDate',
        'closeDate',
        'requestTypeId',
        'requestStatusId',
        'propertyId',
      ],
      include: [
        {
          relation: 'requestType',
          scope: {
            fields: ['id', 'requestTypeName'],
          },
        },
        {
          relation: 'requestStatus',
          scope: {
            fields: ['id', 'statusName'],
          },
        },
        {
          relation: 'property',
          scope: {
            fields: ['id', 'address', 'price', 'propertyTypeId'],
            include: [
              {
                relation: 'propertyType',
                scope: {
                  fields: ['id', 'typeName'],
                  limit: 1,
                },
              },
              {
                relation: 'propertyPictures',
                scope: {
                  //TODO:
                  //       /*Encontrar la manera de traer solo algunos campos de la relación.
                  //        *No se ha logrado que funcione en una relación de tipo hasMany, en la
                  //        *relación belongsTo con si funciona haciendo un fields:['columna1','columna2'],
                  //        *Pero en relaciones hasMany como esta(Property → PropertyPictures) no funciona
                  //        */
                  limit: 1,
                },
              },
            ],
          },
        },
      ],
    });

    if (!requests) {
      throw new HttpErrors[400]('No se encontraron solicitudes');
    }

    return requests;
  }

  public async getDetailsRequest(
    customerId: number,
    requestId: number,
  ): Promise<RequestModel> {
    const request = await this.requestRepository.findOne({
      fields: [
        'id',
        'creationDate',
        'closeDate',
        'requestTypeId',
        'requestStatusId',
        'propertyId',
        'advisorId',
      ],
      include: [
        {
          relation: 'requestType',
          scope: {
            fields: ['id', 'requestTypeName'],
          },
        },
        {
          relation: 'requestStatus',
          scope: {
            fields: ['id', 'statusName'],
          },
        },
        {
          relation: 'property',
          scope: {
            fields: [
              'id',
              'address',
              'price',
              'videoSource',
              'propertyTypeId',
              'cityId',
            ],
            include: [
              {
                relation: 'propertyType',
                scope: {
                  fields: ['id', 'typeName'],
                  limit: 1,
                },
              },
              {
                relation: 'propertyPictures',
              },
              {
                relation: 'city',
                scope: {
                  include: [
                    {
                      relation: 'department',
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          relation: 'advisor',
          scope: {
            fields: [
              'id',
              'firstName',
              'secondName',
              'firtsLastName',
              'secondLastName',
              'email',
              'phone',
            ],
          },
        },
        {
          relation: 'reports',
        },
      ],
      where: {id: requestId, customerId: customerId},
    });

    if (!request) {
      throw new HttpErrors[400]('No se encontró la request');
    }

    return request;
  }

  /**
   * recibe la informacion de la request que se desea crear, en un shcema de request
   * @param request
   * @returns Request
   */
  public async notifyAdvisor(request: RequestModel): Promise<RequestModel> {
    const property = await this.propertyRepository.findOne({
      where: {id: request.propertyId},
    });
    if (!property) {
      throw HttpErrors[400]('no se encuentra la propiedad');
    }
    const advisorProperty = await this.advisorRepository.findOne({
      where: {id: property.advisorId},
    });
    if (!advisorProperty) {
      throw HttpErrors[400]('no se encontro el asesor');
    }
    request.requestStatusId = 1; //estado 1= estado enviado
    request.creationDate = new Date(Date.now());
    let repetRequest = await this.requestRepository.find({
      where: {
        customerId: request.customerId,
        propertyId: request.propertyId,
      },
    });
    //se revisa que si haya llegado un array, y se recorre request por request para verificar que no tenga multiples solicitudes enviadas
    if (repetRequest) {
      repetRequest.forEach(element => {
        if (!element.closeDate) {
          throw HttpErrors[400](
            'un cliente no puede hacer mas de una solicitud a una misma propiedad, cuando ya cuenta con una activa',
          );
        }
        if (!request.creationDate) {
          throw HttpErrors[400]('se ha generado un error al crear la fecha');
        }
        if (element.closeDate.getDate > request.creationDate.getDate) {
          throw HttpErrors[400](
            'un cliente no puede hacer mas de una solicitud a una misma propiedad, cuando ya cuenta con una activa',
          );
        }
      });
    }
    const newRequest = await this.customerRepository
      .requests(request.customerId)
      .create(request);
    this.notifyAdvisorEmail(advisorProperty, property);
    return newRequest;
  }

  /**
   *recibe el advisor y la proppiedad para notificar al advisor de esa propiedad
   * e indicarle el id de la propiedad que recibio la request
   * @param advisorProperty
   * @param property
   */
  private notifyAdvisorEmail(advisorProperty: Advisor, property: Property) {
    const url = configurationNotification.urlNotification2fa;
    let data = {
      destinationEmail: advisorProperty.email,
      destinationName:
        advisorProperty.firstName + ' ' + advisorProperty.secondName
          ? advisorProperty.secondName
          : '' + '' + advisorProperty.firtsLastName,
      contectEmail: `se ha hecho una solicitud a la propiedad con id ${property.id}.`,
      subjectEmail: configurationNotification.subjectCustomerNotification,
    };
    this.notificationService.SendNotification(data, url);
  }

  public async cancelRequest(
    customerId: number,
    requestId: number,
  ): Promise<RequestModel> {
    const request = await this.requestRepository.findOne({
      where: {id: requestId, customerId: customerId},
    });
    if (!request) {
      throw new HttpErrors[400](
        'No se encontró la solicitud que desea cancelar',
      );
    }

    if (request.requestStatusId !== 1) {
      throw new HttpErrors[400](
        'Solo se puede cancelar una solicitud en estado enviado',
      );
    }

    request.requestStatusId = 12;

    const newRequest: RequestModel = await this.requestRepository.save(
      request,
      {
        where: {id: requestId, customerId: customerId},
      },
    );
    return newRequest;
  }
}
