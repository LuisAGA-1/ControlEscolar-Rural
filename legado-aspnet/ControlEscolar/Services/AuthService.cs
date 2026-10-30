using System.Security.Claims;
using ControlEscolar.Models;
using ControlEscolar.Repostories;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace ControlEscolar.Services;

public class AuthService(EscolarRepository repo)
{
    public async Task<ClaimsPrincipal?> ValidarAsync(string email, string password)
    {
        var encontrado = await repo.BuscarUsuarioAsync(email.Trim());
        if (encontrado is not { } u || !u.Activo || !VerificarHash(password, u.Hash)) return null;
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, u.Usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, u.Usuario.Nombre),
            new Claim(ClaimTypes.Email, u.Usuario.Email),
            new Claim(ClaimTypes.Role, u.Usuario.Rol),
            new Claim("escuela_id", u.Usuario.EscuelaId.ToString()),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
    }

    static bool VerificarHash(string password, string hash)
    {
        try { return BCrypt.Net.BCrypt.Verify(password, hash); }
        catch (BCrypt.Net.SaltParseException) { return false; } // hash de prueba sin 002_avance1.sql
    }
}

public static class UsuarioExtensions
{
    public static UsuarioActual Actual(this ClaimsPrincipal u) => new(
        Guid.Parse(u.FindFirstValue(ClaimTypes.NameIdentifier)!),
        u.FindFirstValue(ClaimTypes.Name)!,
        u.FindFirstValue(ClaimTypes.Email)!,
        u.FindFirstValue(ClaimTypes.Role)!,
        Guid.Parse(u.FindFirstValue("escuela_id")!));
}
