import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
@Injectable({
providedIn: 'root',})

export class ApiGestionUsuario {
  hostBase: string;
  constructor(private _http:HttpClient) {
    this.hostBase = "http://localhost:3000/api/usuarios/";
  }

  public login(identificador: string, password: string):Observable<any> {
    const httpOption = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }
    let body = JSON.stringify({ identificador: identificador, password: password }); //Convierte el objeto a JSON para enviarlo al backend
    return this._http.post(this.hostBase + 'login', body, httpOption);
  }

  public logout() {
    sessionStorage.removeItem("legajo");
    sessionStorage.removeItem("nombre");
    sessionStorage.removeItem("apellido");
    sessionStorage.removeItem("rol");
    sessionStorage.removeItem("token");
  }

  //devuelve true si el usuario está logueado
  public userLoggedIn(){
    var resultado = false;
    var usuario = sessionStorage.getItem("legajo");
    if(usuario!=null){
      resultado = true;
    }
    return resultado;
  }

  //devuelve el nombre del usuario logueado
  public userLogged(){
    var usuario = sessionStorage.getItem("nombre");
    return usuario;
  }
  //devuelve el rol del usuario logueado
  public roleLogged(){
    var role = sessionStorage.getItem("rol");
    return role;
  }

  //devuelve el apellido del usuario logueado
  public apellidoLogged(){
    var apellido = sessionStorage.getItem("apellido");
    return apellido;
  }
  
  //Login Verificacion
  public loginVerificacion(correo: string): Observable<any> {
    const httpOption = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }
    let body = JSON.stringify({ correo: correo }); //Convierte el objeto a JSON para enviarlo al backend
    return this._http.post(this.hostBase + 'login-verificacion', body, httpOption);
  }

  public registrar(usuario: any): Observable<any> {
    const token = sessionStorage.getItem('token');
    const httpOption = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    }
    return this._http.post(this.hostBase + 'registro', usuario, httpOption);
  }
}