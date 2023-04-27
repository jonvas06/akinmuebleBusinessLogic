import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {SecurityConfiguration} from '../config/security.config';
import {CustomerRegister} from '../models';
import {CustomerRepository} from '../repositories';
const fetch = require('node-fetch');

@injectable({scope: BindingScope.TRANSIENT})
export class CustomerService {
  constructor(
    @repository(CustomerRepository)
    private customerRepository: CustomerRepository,
  ) {}


  public async getInfoLoginCustomer(customer: CustomerRegister): Promise<Object> {

    const newCustomer: CustomerRegister = await this.customerRepository.create(customer)
    if (!newCustomer) {
    throw new HttpErrors[400]("No se pudo crear el customer");
    }

    const data = {
      firstName : customer.firstName,
      secondName: customer.secondName,
      firstLastName : customer.firstLastName,
      secondLastName : customer.secondLastName,
      documentNumber : customer.documentNumber,
      email: customer.email,
      password : customer.password,
      phone: customer.phone,
      idrole : `${SecurityConfiguration.rolIds.customer}`
    }

    const url = `${SecurityConfiguration.securityMicroserviceLink,SecurityConfiguration.createUserEndPoint}`

    const rest = await fetch(url, {
      method: 'post',
      body: JSON.stringify(data),
      headers: {'Content-type': 'application/json'},
    });

    const json = rest.json()
    console.log(json);

    return json;
  }
}
