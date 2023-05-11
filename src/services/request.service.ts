import {BindingScope, injectable, service} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {configurationNotification} from '../config/notification.config';
import {Advisor, Request as RequestModel} from '../models';
import {CustomResponse} from '../models/custom-reponse.model';
import {AdvisorRepository, RequestRepository} from '../repositories';
import {NotificationService} from './notification.service';

@injectable({scope: BindingScope.TRANSIENT})
export class RequestService {
  constructor(
    @repository(RequestRepository)
    protected requestRepository: RequestRepository,
    @repository(AdvisorRepository)
    protected advisorrepository: AdvisorRepository,
    @service(NotificationService)
    protected notificationService: NotificationService,
  ) {}

  async changeAdvisor(
    requestId: number,
    newAdvisorId: number,
  ): Promise<CustomResponse> {
    const response: CustomResponse = new CustomResponse();

    const request: RequestModel = await this.requestRepository.findById(
      requestId,
    );

    if (!request) {
      throw new HttpErrors[400]('No se encontró la solicitud');
    }

    if (request.requestStatusId != 1) {
      throw new HttpErrors[400](
        'No puedes reasignar una solicitud que no está en estado enviado',
      );
    }

    const previousAdvisor: Advisor = await this.requestRepository.advisor(
      requestId,
    );

    const newAdvisor = await this.advisorrepository.findById(newAdvisorId);

    if (!newAdvisor) {
      throw new HttpErrors[400](
        'No se encontró el asesor al que desea asignarle la solicitud',
      );
    }

    request.advisorId = newAdvisorId;

    request.requestStatusId = 2;
    this.requestRepository.save(request);

    const previousAdvisorEmailData = {
      destinationEmail: previousAdvisor.email,
      destinationName: `${previousAdvisor.firstName} ${previousAdvisor.firtsLastName}`,
      contectEmail: `La solictitud con id  ${request.id} que estaba a tu cargo ha sido asignada a otro asesor`,
      subjectEmail: configurationNotification.subjectAdvisorNotification,
    };

    const newAdvisorEmailData = {
      destinationEmail: newAdvisor.email,
      destinationName: `${newAdvisor.firstName} ${newAdvisor.firtsLastName}`,
      contectEmail: `La administración te ha asignado la solictitud con id  ${request.id} para que la estudies`,
      subjectEmail: configurationNotification.subjectAdvisorNotification,
    };

    const url = configurationNotification.urlNotification2fa;

    this.notificationService.SendNotification(previousAdvisorEmailData, url);
    this.notificationService.SendNotification(newAdvisorEmailData, url);

    response.ok = true;
    response.message = 'Se ha reasignado la solicitud con éxito';
    response.data = {};

    return response;
  }
}
